import { Router, Response } from 'express';
import { IRequest } from '../utils/request-interface';

const proxyRouter = Router();

const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return true;
  }
  if (host.startsWith('10.') || host.startsWith('192.168.')) {
    return true;
  }
  return /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
};

const sanitizeHtml = (html: string, baseUrl: string): string => {
  if (!/<head[\s>]/i.test(html)) {
    return html;
  }

  const hasBase = /<base[\s>]/i.test(html);
  const baseTag = hasBase ? '' : `<base href="${baseUrl}">`;
  return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
};

const parsePublicHttpUrl = (rawUrl?: string): URL | undefined => {
  if (!rawUrl) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return undefined;
  }

  if (!(parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
    return undefined;
  }

  if (isPrivateHost(parsed.hostname)) {
    return undefined;
  }

  return parsed;
};

proxyRouter.get('/api/pdf-proxy', async (request: IRequest, response: Response) => {
  const sourceUrl = request.query.url;
  const parsed = parsePublicHttpUrl(typeof sourceUrl === 'string' ? sourceUrl : undefined);

  if (!sourceUrl) {
    response.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  if (!parsed) {
    response.status(400).json({ error: 'Invalid or private url parameter' });
    return;
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        Accept: 'application/pdf,*/*'
      }
    });

    if (!upstream.ok) {
      response.status(upstream.status).json({ error: `Failed to fetch PDF (${upstream.status})` });
      return;
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('pdf')) {
      response.status(415).json({ error: 'Target URL does not look like a PDF resource' });
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).send(buffer);
  } catch {
    response.status(502).json({ error: 'Unable to fetch PDF' });
  }
});

proxyRouter.get('/api/web-proxy', async (request: IRequest, response: Response) => {
  const sourceUrl = request.query.url;
  const parsed = parsePublicHttpUrl(typeof sourceUrl === 'string' ? sourceUrl : undefined);

  if (!sourceUrl) {
    response.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  if (!parsed) {
    response.status(400).json({ error: 'Invalid or private url parameter' });
    return;
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      redirect: 'follow'
    });

    if (!upstream.ok) {
      response.status(upstream.status).json({ error: `Failed to fetch target (${upstream.status})` });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'text/html; charset=utf-8';
    const isHtml = contentType.toLowerCase().includes('text/html');

    response.setHeader('Cache-Control', 'no-store');

    if (isHtml) {
      const html = await upstream.text();
      const adjusted = sanitizeHtml(html, parsed.toString());
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.status(200).send(adjusted);
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    response.setHeader('Content-Type', contentType);
    response.status(200).send(buffer);
  } catch {
    response.status(502).json({ error: 'Unable to fetch target URL' });
  }
});

export default proxyRouter;
