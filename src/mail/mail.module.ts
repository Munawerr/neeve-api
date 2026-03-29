import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (): Promise<MailerOptions> => {
        const mailerConfig: MailerOptions = {
          transport: {
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            secure: true,
            auth: {
              user: process.env.MAIL_USERNAME,
              pass: process.env.MAIL_PASSWORD,
            },
            tls: { rejectUnauthorized: true },
            ignoreTLS: false,
          },
          defaults: {
            from: '"Neeve" <info@neeve.io>',
          },
        };

        if (process.env.NODE_ENV !== 'test') {
          // Load template adapter only outside tests to avoid Jest open-handle issue from css-inline.
          // Some environments resolve different mailer package layouts, so we try both known paths.
          let HandlebarsAdapter:
            | (new (...args: never[]) => unknown)
            | undefined;

          try {
            ({ HandlebarsAdapter } = await import(
              '@nestjs-modules/mailer/adapters/handlebars.adapter'
            ));
          } catch {
            try {
              ({ HandlebarsAdapter } = await import(
                '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'
              ));
            } catch {
              HandlebarsAdapter = undefined;
            }
          }

          if (HandlebarsAdapter) {
            mailerConfig.template = {
              dir: join(__dirname, 'templates'),
              adapter: new HandlebarsAdapter() as any,
              options: {
                strict: false,
              },
            };
          }
        }

        return mailerConfig;
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService], // 👈 export for DI
})
export class MailModule {}
