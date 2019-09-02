with import <nixpkgs> {};

stdenv.mkDerivation {
  name = "fun-app";
  version = "0.1.0";
  system = builtins.currentSystem;

  shellHook = ''
    export PATH="$PATH:$PWD/node_modules/.bin"
  '';

  buildInputs = [
    nodejs-10_x nodePackages.tern yarn
  ];
}
