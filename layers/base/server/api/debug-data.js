import { defineEventHandler } from "h3";

export default defineEventHandler(() => {
    return {
      message: 'This is test data from the server!',
      timestamp: new Date().toISOString()
    }
  })
  
