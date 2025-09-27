# Vercel Deployment Guide

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/work_flow)

## Manual Deployment Steps

### 1. Environment Setup

Set the following environment variable in your Vercel dashboard:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Vercel Configuration

The app includes a `vercel.json` configuration file that:
- Sets up serverless functions for API routes
- Configures proper routing for the SPA
- Optimizes the build process

### 3. Deploy via Git

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository in Vercel dashboard
3. Set environment variables
4. Deploy automatically

### 4. Deploy via CLI

```bash
npm i -g vercel
vercel login
vercel
```

Follow the prompts to configure your deployment.

## API Endpoints

After deployment, your serverless functions will be available at:

- `https://yourapp.vercel.app/api/generate-image`
- `https://yourapp.vercel.app/api/edit-image`
- `https://yourapp.vercel.app/api/enhance-prompt`
- `https://yourapp.vercel.app/api/start-video-generation`
- `https://yourapp.vercel.app/api/check-video-status`

## Troubleshooting

### Common Issues

1. **API Key Not Found**: Ensure `GEMINI_API_KEY` is set in Vercel environment variables
2. **Function Timeout**: Increase function timeout in vercel.json if needed
3. **CORS Issues**: API functions include proper CORS headers
4. **Build Errors**: Check that all dependencies are installed correctly

### Logs

Check function logs in Vercel dashboard under:
- Functions tab → Select function → View logs

## Performance Optimization

- Functions are set to Node.js 20.x runtime for optimal performance
- Images are optimized for web delivery
- Proper caching headers are included in API responses

## Security

- API key is stored securely in Vercel environment variables
- Functions include proper CORS configuration
- No sensitive data is exposed to the client side