# Versioning Policy

Version display is now **manual**.

## How to update the app version

1. Open `index.html`.
2. Update the `APP_VERSION` constant.

Example:

```js
const APP_VERSION = "v0.1.1";
```

That value is rendered directly in the footer at runtime.

## Notes

- CI/CD no longer injects version strings from tags, commits, or pull requests.
- You can bump the version whenever you want by editing `index.html`.
