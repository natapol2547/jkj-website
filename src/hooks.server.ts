import type { Handle } from "@sveltejs/kit";
import { adminAuth } from "$lib/server/admin";
import { dev } from "$app/environment";

export const handle: Handle = (async ({ event, resolve }) => {
  const sessionCookie = event.cookies.get("__session");

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie!);
    event.locals.userID = decodedClaims.uid;
    console.log("found user id", decodedClaims.uid);
  } catch (e) {
    event.locals.userID = null;
    return resolve(event);
  }
  // For /py/*, proxy to http://localhost:8000/py/* (local development only)
  if (event.url.pathname.startsWith('/py/') && dev) {
    const baseUrl = 'http://localhost:8000';
    const targetUrl = new URL(event.url.pathname + event.url.search, baseUrl);
    
    // Forward the request to the target server, including cookies
    const response = await fetch(targetUrl.toString(), {
      method: event.request.method,
      headers: event.request.headers,
      body: event.request.method !== 'GET' && event.request.method !== 'HEAD' 
        ? await event.request.clone().arrayBuffer() 
        : undefined
    });

    // Create a new response with the proxied content
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  return resolve(event);
}) satisfies Handle;