{ pkgs ? import <nixpkgs> {} }:

let
  env = pkgs.buildFHSUserEnv {
    name = "funapp";
    targetPkgs = pkgs: with pkgs.nodejs_18.pkgs; [
      nodejs tern yarn "@vue/cli" vue-language-server
    ];
    runScript = pkgs.writeScript "env-shell" ''
      #!${pkgs.stdenv.shell}
      exec ${userShell}
    '';
  };

  userShell = builtins.getEnv "SHELL";

in pkgs.stdenv.mkDerivation {
  name = "funapp-fhs-dev";

  shellHook = ''
    exec ${env}/bin/funapp
  '';
  buildCommand = "exit 1";
}

