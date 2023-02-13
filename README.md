# FunApp

## Getting started

```bash
$ git submodule update --init --recursive
# If you have Nix installed:
$ nix-shell
# Otherwise you need to have Node.js and Yarn installed.
$ ./prepare.sh
$ yarn serve
```

## If problems with ```yarn serve```

```bash
rm -rf node_modules
```
