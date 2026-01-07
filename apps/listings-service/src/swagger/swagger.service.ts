import { Injectable } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';

@Injectable()
export class SwaggerDocument {
  private document: OpenAPIObject | null = null;

  setDocument(document: OpenAPIObject) {
    this.document = document;
  }

  getDocument(): OpenAPIObject {
    if (!this.document) {
      throw new Error('Swagger document not initialized');
    }
    return this.document;
  }
}

