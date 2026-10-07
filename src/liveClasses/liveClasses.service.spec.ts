import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { LiveClassesService } from './liveClasses.service';
import { CreateLiveClassDto } from './dto/create-liveClass.dto';

const anyFn = () => jest.fn<(args?: any) => any>();

describe('LiveClassesService.joinLiveClass (join window logic)', () => {
  const instituteId = new Types.ObjectId();
  const studentId = new Types.ObjectId();

  const makeLiveClass = (overrides: any) => ({
    _id: new Types.ObjectId(),
    date: new Date(Date.UTC(2026, 0, 1)), // stored as UTC-midnight of "2026-01-01"
    startTime: '15:30',
    endTime: '16:30',
    timezoneOffsetMinutes: 0,
    liveSessionUrl: 'https://meet.test/live',
    institute: instituteId,
    isDeleted: false,
    ...overrides,
  });

  const makeService = (liveClassDoc: any) => {
    const liveClassModel = {
      findOne: anyFn().mockReturnValue({
        exec: anyFn().mockResolvedValue(liveClassDoc),
      }),
    };
    const userModel = {
      findById: anyFn().mockResolvedValue({
        full_name: 'Test Student',
        email: 'student@test.com',
        phone: '',
        regNo: 'STU-1',
        institute: instituteId,
      }),
    };
    const attendanceModel = {
      findOneAndUpdate: anyFn().mockReturnValue({
        exec: anyFn().mockResolvedValue({
          liveClass: liveClassDoc._id,
          student: studentId,
          institute: instituteId,
          joinedAt: new Date(),
          lastJoinedAt: new Date(),
          joinCount: 1,
        }),
      }),
    };
    return new LiveClassesService(
      liveClassModel as any,
      attendanceModel as any,
      userModel as any,
    );
  };

  const setNow = (iso: string) => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(iso));
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens exactly 10 minutes before the scheduled start time', async () => {
    const service = makeService(makeLiveClass({ timezoneOffsetMinutes: 0 }));
    setNow('2026-01-01T15:20:00.000Z'); // = 10 min before 15:30 UTC
    await expect(
      service.joinLiveClass('classId', studentId.toString()),
    ).resolves.toMatchObject({ liveSessionUrl: 'https://meet.test/live' });
  });

  it('rejects when earlier than 10 minutes before start', async () => {
    const service = makeService(makeLiveClass({ timezoneOffsetMinutes: 0 }));
    setNow('2026-01-01T15:19:59.000Z');
    await expect(
      service.joinLiveClass('classId', studentId.toString()),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.joinLiveClass('classId', studentId.toString()),
    ).rejects.toThrow(/not open yet/);
  });

  it('allows joining after start while the class is ongoing', async () => {
    const service = makeService(makeLiveClass({ timezoneOffsetMinutes: 0 }));
    setNow('2026-01-01T15:45:00.000Z'); // after 15:30 start, before 16:30 end
    await expect(
      service.joinLiveClass('classId', studentId.toString()),
    ).resolves.toMatchObject({ liveSessionUrl: 'https://meet.test/live' });
  });

  it('rejects once the configured end time has passed', async () => {
    const service = makeService(makeLiveClass({ timezoneOffsetMinutes: 0 }));
    setNow('2026-01-01T16:30:01.000Z');
    await expect(
      service.joinLiveClass('classId', studentId.toString()),
    ).rejects.toThrow(/has ended/);
  });

  it('without an end time, closes 1 hour after start', async () => {
    const service = makeService(
      makeLiveClass({ timezoneOffsetMinutes: 0, endTime: null }),
    );
    // 59 min after start -> allowed
    setNow('2026-01-01T16:29:59.000Z');
    await expect(
      service.joinLiveClass('classId', studentId.toString()),
    ).resolves.toMatchObject({ liveSessionUrl: 'https://meet.test/live' });
    // 1h + 1s after start -> rejected
    setNow('2026-01-01T16:30:01.000Z');
    await expect(
      service.joinLiveClass('classId', studentId.toString()),
    ).rejects.toThrow(/has ended/);
  });

  it('applies the stored timezone offset (IST class at 15:30 is open from 15:20 local)', async () => {
    // IST scheduler (offset -330), start 15:30 local -> 2026-01-01T10:00:00Z
    const service = makeService(makeLiveClass({ timezoneOffsetMinutes: -330 }));
    // Student joins at 15:24 IST = 09:54Z (inside the 10-minute window) -> allowed
    setNow('2026-01-01T09:54:00.000Z');
    await expect(
      service.joinLiveClass('classId', studentId.toString()),
    ).resolves.toMatchObject({ liveSessionUrl: 'https://meet.test/live' });
    // Student tries at 15:14 IST = 09:44Z (11 min before) -> rejected
    setNow('2026-01-01T09:44:00.000Z');
    await expect(
      service.joinLiveClass('classId', studentId.toString()),
    ).rejects.toThrow(/not open yet/);
  });

  it('legacy classes without a stored offset fall back to UTC interpretation', async () => {
    const service = makeService(
      makeLiveClass({ timezoneOffsetMinutes: undefined }),
    );
    setNow('2026-01-01T15:20:00.000Z');
    await expect(
      service.joinLiveClass('classId', studentId.toString()),
    ).resolves.toMatchObject({ liveSessionUrl: 'https://meet.test/live' });
  });
});

describe('LiveClassesService.create (persists scheduler timezone)', () => {
  it('stores timezoneOffsetMinutes passed in the DTO', async () => {
    const saveMock = anyFn().mockResolvedValue({
      title: 'Test',
      timezoneOffsetMinutes: -330,
    });
    const LiveClassModelMock: any = jest
      .fn<(dto?: any) => any>()
      .mockImplementation((dto: any) => ({ ...dto, save: saveMock }));
    const service = new LiveClassesService(
      LiveClassModelMock,
      {} as any,
      {} as any,
    );

    const dto = {
      title: 'Test',
      date: new Date(Date.UTC(2026, 0, 1)),
      startTime: '15:30',
      endTime: '16:30',
      package: 'pkg',
      subject: 'subj',
      institute: 'inst',
      timezoneOffsetMinutes: -330,
    } as CreateLiveClassDto;
    const result = await service.create(dto);

    expect(LiveClassModelMock).toHaveBeenCalledWith(
      expect.objectContaining({ timezoneOffsetMinutes: -330 }),
    );
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ timezoneOffsetMinutes: -330 }),
    );
  });
});
