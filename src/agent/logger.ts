/**
 * Structured Logger for ArcAgent Treasury
 * JSON log format with module-based logging
 */

export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private _log(level: string, msg: string, data: Record<string, unknown> = {}) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      module: this.module,
      msg,
      ...data,
    };
    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }

  info(msg: string, data?: Record<string, unknown>) {
    this._log('info', msg, data);
  }

  warn(msg: string, data?: Record<string, unknown>) {
    this._log('warn', msg, data);
  }

  error(msg: string, data?: Record<string, unknown>) {
    this._log('error', msg, data);
  }

  debug(msg: string, data?: Record<string, unknown>) {
    if (process.env.DEBUG) {
      this._log('debug', msg, data);
    }
  }
}
