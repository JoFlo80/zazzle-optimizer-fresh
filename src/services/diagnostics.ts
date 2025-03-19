import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { ErrorCodes } from './errorHandler';

export interface DiagnosticReport {
  error_code: keyof typeof ErrorCodes;
  message: string;
  request_id: string;
  timestamp: number;
  diagnostic_info: {
    input_validation?: {
      missing_fields?: string[];
      invalid_fields?: string[];
      validation_errors?: string[];
    };
    content_analysis?: {
      title_length?: number;
      description_length?: number;
      tag_count?: number;
      has_required_elements?: boolean;
    };
    image_processing?: {
      file_size?: number;
      file_type?: string;
      dimensions?: {
        width: number;
        height: number;
      };
      processing_error?: string;
    };
    model_info?: {
      attempted_model?: string;
      allowed_model: string;
    };
    context?: Record<string, unknown>;
  };
}

export class DiagnosticSystem {
  private static instance: DiagnosticSystem;
  private reports: Map<string, DiagnosticReport> = new Map();

  private constructor() {}

  static getInstance(): DiagnosticSystem {
    if (!DiagnosticSystem.instance) {
      DiagnosticSystem.instance = new DiagnosticSystem();
    }
    return DiagnosticSystem.instance;
  }

  createReport(params: {
    code: keyof typeof ErrorCodes;
    message: string;
    context?: Record<string, unknown>;
  }): DiagnosticReport {
    const requestId = uuidv4();
    const timestamp = Date.now();

    const report: DiagnosticReport = {
      error_code: params.code,
      message: params.message,
      request_id: requestId,
      timestamp,
      diagnostic_info: {
        context: params.context
      }
    };

    // Add specific diagnostic information based on error type
    switch (params.code) {
      case 'MISSING_INPUT':
        report.diagnostic_info.input_validation = {
          missing_fields: this.extractMissingFields(params.context)
        };
        break;

      case 'INVALID_JSON':
        report.diagnostic_info.input_validation = {
          validation_errors: ['Invalid JSON structure detected']
        };
        break;

      case 'IMAGE_PROCESSING_ERROR':
        report.diagnostic_info.image_processing = this.extractImageInfo(params.context);
        break;

      case 'MODEL_ERROR':
        report.diagnostic_info.model_info = {
          attempted_model: params.context?.attemptedModel as string,
          allowed_model: 'gpt-4o'
        };
        break;

      case 'CONTENT_ERROR':
        report.diagnostic_info.content_analysis = this.analyzeContent(params.context);
        break;
    }

    this.reports.set(requestId, report);
    this.logReport(report);

    return report;
  }

  private extractMissingFields(context?: Record<string, unknown>): string[] {
    if (!context?.missingFields) return [];
    return Array.isArray(context.missingFields) 
      ? context.missingFields 
      : [String(context.missingFields)];
  }

  private extractImageInfo(context?: Record<string, unknown>): DiagnosticReport['diagnostic_info']['image_processing'] {
    if (!context?.imageFile) return { processing_error: 'No image data provided' };

    const file = context.imageFile as File;
    return {
      file_size: file.size,
      file_type: file.type,
      dimensions: context.dimensions as { width: number; height: number },
      processing_error: context.error as string
    };
  }

  private analyzeContent(context?: Record<string, unknown>): DiagnosticReport['diagnostic_info']['content_analysis'] {
    if (!context?.content) return { has_required_elements: false };

    const content = context.content as {
      title?: string;
      description?: string;
      tags?: string;
    };

    return {
      title_length: content.title?.length || 0,
      description_length: content.description?.length || 0,
      tag_count: content.tags?.split(',').length || 0,
      has_required_elements: !!(content.title && content.description && content.tags)
    };
  }

  private logReport(report: DiagnosticReport): void {
    logger.error('DiagnosticSystem', `Error [${report.error_code}]: ${report.message}`, {
      requestId: report.request_id,
      diagnosticInfo: report.diagnostic_info
    });

    if (import.meta.env.DEV) {
      console.error('\n=== Diagnostic Report ===');
      console.error(JSON.stringify(report, null, 2));
    }
  }

  getReport(requestId: string): DiagnosticReport | undefined {
    return this.reports.get(requestId);
  }

  getAllReports(): DiagnosticReport[] {
    return Array.from(this.reports.values());
  }

  clearReports(): void {
    this.reports.clear();
  }

  formatReport(report: DiagnosticReport): string {
    return JSON.stringify({
      error_code: report.error_code,
      message: report.message,
      request_id: report.request_id,
      timestamp: report.timestamp,
      diagnostic_info: report.diagnostic_info
    }, null, 2);
  }
}

export const diagnosticSystem = DiagnosticSystem.getInstance();