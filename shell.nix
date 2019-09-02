with import <nixpkgs> {};

stdenv.mkDerivation {
  name = "fun-app";
  version = "0.1.0";
  system = builtins.currentSystem;

  shellHook = ''
    export PATH="$PATH:$PWD/node_modules/.bin"
  '';

  buildInputs = [
    automake autoconf m4 git bash
    nodejs-10_x libpng libGL gcc
    nodePackages.tern yarn
  ];
}
