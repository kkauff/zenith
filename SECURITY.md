# Security policy

## Reporting a vulnerability

If you believe you've found a security vulnerability in Zenith, please
**do not open a public issue**. Instead, report it privately so it can
be triaged before disclosure:

- Open a [private security advisory](https://github.com/kkauff/zenith/security/advisories/new)
  on this repository, **or**
- Use the contact info on the maintainer's GitHub profile
  ([@kkauff](https://github.com/kkauff)) to reach out directly.

Please include:

- A description of the issue and the impact.
- Steps to reproduce (a minimal proof-of-concept is ideal).
- Affected versions / deployments if known.

You should expect an initial acknowledgement within a few days. Once
the fix lands, the advisory will be published with credit (unless you
prefer to remain anonymous).

## Scope

This repository hosts a client-side React + Firebase app. Reports are
in scope if they concern:

- The web app itself (XSS, auth bypass, client-side data leaks).
- The Firestore security rules documented in the README.
- Dependencies pinned in `package.json`.

Out of scope: vulnerabilities in upstream Firebase, Vercel, or browser
runtimes — please report those to the relevant vendor.
