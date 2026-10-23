import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service.js';
import { OpenAiService } from './openai.service.js';

@Module({
  providers: [GeminiService, OpenAiService],
  exports: [GeminiService, OpenAiService],
})
export class AiModule {}
