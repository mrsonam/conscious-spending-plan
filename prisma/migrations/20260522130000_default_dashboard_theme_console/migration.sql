-- New signups use Wealth Console (bento) as the default shell.
ALTER TABLE "User" ALTER COLUMN "dashboardTheme" SET DEFAULT 'console';
