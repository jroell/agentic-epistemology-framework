import { FunctionTool } from '../tool';
import { Capability } from '../capability';
import { Context } from '../../core/context';
import { SchemaType } from '@google/generative-ai';

export class ReportGeneratorTool extends FunctionTool {
  constructor() {
    const reportFunction = (context: Context, parameters: { input_data: any, report_format?: string }): any => {
      const format = parameters.report_format || 'summary';
      console.log(`[Tool: Report Generator] Generating ${format} report...`);
      // Simulate report generation
      const inputString = JSON.stringify(parameters.input_data);
      if (format === 'summary') {
        return `Summary Report: Analysis complete. Key findings based on data: ${inputString.substring(0, 50)}...`;
      } else {
        return `Detailed Report:\nData Analyzed:\n${inputString}\nAnalysis Conclusion: Positive outcome noted.`;
      }
    };

    super(
      reportFunction,
      'Report Generator',
      'Generates a summary or detailed report based on input data or analysis results.',
      new Set([Capability.TextGeneration]), // Assuming TextGeneration is appropriate
      { // Parameter Schema
        type: SchemaType.OBJECT,
        properties: {
          input_data: { type: SchemaType.OBJECT, description: 'The data or analysis results to report on.' },
          report_format: { 
            type: SchemaType.STRING, 
            description: 'Format of the report (e.g., summary, detailed)',
            enum: ['summary', 'detailed'],
            optional: true 
          }
        },
        required: ['input_data']
      },
      { type: SchemaType.STRING, description: 'The generated report text.' }, // outputSchema
      1, // baseCost
      'report_generator' // id
    );
  }
}
