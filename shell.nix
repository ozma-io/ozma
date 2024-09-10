{pkgs ? import <nixpkgs> {}}: let
  nodejs = pkgs.nodejs_18;

  env = pkgs.buildFHSUserEnv {
    name = "ozma";
    targetPkgs = pkgs:
      with pkgs;
      with nodejs.pkgs; [
        alejandra
        nodejs
        tern
        yarn-berry
        "@vue/cli"
        vue-language-server
      ];
    runScript = pkgs.writeScript "env-shell" ''
      #!${pkgs.stdenv.shell}
      exec ${userShell}
    '';
  };

  userShell = builtins.getEnv "SHELL";
in
  pkgs.stdenv.mkDerivation {
    name = "ozma-fhs-dev";

    shellHook = ''
      exec ${env}/bin/ozma
    '';
    buildCommand = "exit 1";
  }
