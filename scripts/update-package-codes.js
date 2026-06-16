require('dotenv').config();
const mongoose = require('mongoose');

function stripWrappingQuotes(value) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const isSingle = trimmed.startsWith("'") && trimmed.endsWith("'");
  const isDouble = trimmed.startsWith('"') && trimmed.endsWith('"');
  if (isSingle || isDouble) return trimmed.slice(1, -1);
  return trimmed;
}

const CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function buildRandomCode(length) {
  let result = '';
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARSET.length);
    result += CODE_CHARSET[randomIndex];
  }
  return result;
}

async function generateUniqueCode(PackageModel, usedCodes, courseCode, classCode) {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = `${courseCode}/${classCode}/${year}/${buildRandomCode(8)}`;
    if (usedCodes.has(candidate)) {
      continue;
    }

    const existing = await PackageModel.exists({ code: candidate });
    if (!existing) {
      usedCodes.add(candidate);
      return candidate;
    }
  }

  throw new Error(`Failed to generate unique code for ${courseCode}/${classCode}`);
}

async function run() {
  const uri =
    stripWrappingQuotes(process.env.MONGODB_URI) ||
    stripWrappingQuotes(process.env.DB_URL) ||
    stripWrappingQuotes(process.env.MONGO_URL);

  if (!uri) {
    console.error('NO_URI: Set MONGODB_URI or DB_URL');
    process.exit(2);
  }

  const dbName = process.env.MONGO_DB_NAME || 'neeve';
  const isDryRun = process.argv.includes('--dry-run');

  const packageSchema = new mongoose.Schema(
    {
      course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
      class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
      code: String,
      isDeleted: Boolean,
    },
    { collection: 'packages' },
  );

  const courseSchema = new mongoose.Schema(
    {
      code: String,
      title: String,
    },
    { collection: 'courses' },
  );

  const classSchema = new mongoose.Schema(
    {
      code: String,
      title: String,
    },
    { collection: 'classes' },
  );

  const PackageModel = mongoose.models.PackageBackfill || mongoose.model('PackageBackfill', packageSchema);
  const CourseModel = mongoose.models.CourseBackfill || mongoose.model('CourseBackfill', courseSchema);
  const ClassModel = mongoose.models.ClassBackfill || mongoose.model('ClassBackfill', classSchema);

  try {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000,
    });

    const packages = await PackageModel.find({})
      .select('_id course class code isDeleted')
      .lean();

    if (!packages.length) {
      console.log('NO_PACKAGES_FOUND');
      return;
    }

    const courseIds = [...new Set(packages.map((item) => String(item.course)).filter(Boolean))];
    const classIds = [...new Set(packages.map((item) => String(item.class)).filter(Boolean))];

    const [courses, classes] = await Promise.all([
      CourseModel.find({ _id: { $in: courseIds } }).select('_id code title').lean(),
      ClassModel.find({ _id: { $in: classIds } }).select('_id code title').lean(),
    ]);

    const courseMap = new Map(courses.map((item) => [String(item._id), item]));
    const classMap = new Map(classes.map((item) => [String(item._id), item]));
    const usedCodes = new Set(packages.map((item) => item.code).filter(Boolean));

    let updatedCount = 0;
    let skippedCount = 0;
    const bulkOperations = [];

    for (const pkg of packages) {
      const course = courseMap.get(String(pkg.course));
      const cls = classMap.get(String(pkg.class));

      if (!course?.code || !cls?.code) {
        skippedCount += 1;
        console.warn(
          `SKIP ${pkg._id}: Missing ${!course?.code ? 'course' : 'class'} code reference`,
        );
        continue;
      }

      if (pkg.code) {
        usedCodes.delete(pkg.code);
      }

      const nextCode = await generateUniqueCode(
        PackageModel,
        usedCodes,
        course.code,
        cls.code,
      );

      if (pkg.code === nextCode) {
        skippedCount += 1;
        usedCodes.add(nextCode);
        continue;
      }

      updatedCount += 1;
      console.log(`UPDATE ${pkg._id}: ${pkg.code || '<empty>'} -> ${nextCode}`);

      if (!isDryRun) {
        bulkOperations.push({
          updateOne: {
            filter: { _id: pkg._id },
            update: { $set: { code: nextCode } },
          },
        });
      }
    }

    if (!isDryRun && bulkOperations.length > 0) {
      await PackageModel.bulkWrite(bulkOperations, { ordered: false });
    }

    console.log(
      `DONE updated=${updatedCount} skipped=${skippedCount} mode=${isDryRun ? 'dry-run' : 'write'}`,
    );
  } catch (error) {
    console.error(`BACKFILL_ERROR=${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();