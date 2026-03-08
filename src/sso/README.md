# EduGorilla SSO Integration

This document explains how the SSO (Single Sign-On) integration with EduGorilla has been implemented in LAKSHYA LMS.

## Overview

The integration allows users to seamlessly access EduGorilla resources after authenticating in LAKSHYA LMS. This is achieved through a cookie-based SSO mechanism.

## Implementation Details

### Frontend (React)

1. When a user logs in to LAKSHYA LMS, a cookie named `eg_user` is set with the JWT token
2. The cookie is configured with appropriate domain, path, and security attributes
3. The cookie domain is configurable via the `VITE_SSO_COOKIE_DOMAIN` environment variable

### Backend (NestJS)

The backend implements an endpoint for EduGorilla to validate the SSO cookie:

```
POST /sso_client/user_details_from_cookie
```

This endpoint:
1. Retrieves the `eg_user` cookie from the request
2. Validates the JWT token
3. Fetches the user details if the token is valid
4. Returns the user information in the format expected by EduGorilla

## Configuration

1. Set the `VITE_SSO_COOKIE_DOMAIN` environment variable in your frontend to the domain where the cookie should be valid
2. Ensure the JWT secret key is the same as used for normal authentication

## Testing

You can test the SSO integration by:
1. Logging into LAKSHYA LMS
2. Checking if the `eg_user` cookie is set correctly
3. Accessing EduGorilla resources to verify the SSO flow

## Troubleshooting

- If SSO isn't working, verify the cookie is being set correctly
- Check for CORS issues if the domains are different
- Ensure the JWT token is valid and not expired
- Verify the cookie domain is configured correctly
