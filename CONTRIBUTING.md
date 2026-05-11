# Contributing

Thanks for your interest in Zenith! This is a small personal project,
so the process is light.

## Issues

Bug reports, feature requests, and questions are all welcome — please
open an issue describing what you're seeing or what you'd like.

For bugs, include:

- What you expected to happen and what actually happened.
- Steps to reproduce.
- Browser / OS / device if it might be relevant (the app is a PWA, so
  iOS Safari vs. Android Chrome behavior occasionally differs).

## Pull requests

Before opening a PR for anything non-trivial, please **open an issue
first** so we can agree on the approach. That avoids you spending time
on a direction I won't end up merging.

For small fixes (typos, obvious bugs, doc tweaks), feel free to send
a PR directly.

Local setup is covered in the [README](README.md#run-it-locally). The
short version:

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check + production build (must pass before PR)
```

Please make sure `npm run build` passes before sending a PR — that's
the same command Vercel runs on deploy.

## Security issues

Please do **not** report security issues in public issues or PRs. See
[SECURITY.md](SECURITY.md) for the private reporting process.

## License

By contributing, you agree that your contributions will be licensed
under the [MIT License](LICENSE) that covers the rest of the project.
