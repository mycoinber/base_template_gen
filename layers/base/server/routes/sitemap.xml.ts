import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { serveCrawlDocument } from '../utils/crawl-documents'

export default defineEventHandler(event => serveCrawlDocument(event, useRuntimeConfig(event), 'sitemap'))
