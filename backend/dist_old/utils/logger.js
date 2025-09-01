"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const config_1 = require("@/config");
const logDir = config_1.config.logging.directory;
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
winston_1.default.addColors(colors);
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => {
    if (info.stack) {
        return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`;
    }
    return `${info.timestamp} ${info.level}: ${info.message}`;
}));
const transports = [
    new winston_1.default.transports.Console({
        format,
    }),
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, '%DATE%-combined.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    }),
    new winston_daily_rotate_file_1.default({
        level: 'error',
        filename: path_1.default.join(logDir, '%DATE%-error.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    }),
];
exports.logger = winston_1.default.createLogger({
    level: config_1.config.logging.level,
    format: winston_1.default.format.errors({ stack: true }),
    transports,
    exitOnError: false,
});
exports.morganStream = {
    write: (message) => {
        exports.logger.http(message.substring(0, message.lastIndexOf('\n')));
    },
};
//# sourceMappingURL=logger.js.map