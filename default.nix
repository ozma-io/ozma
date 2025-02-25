{
  buildFHSEnv,
  nodejs_18,
  writers,
}: let
  nodejs = nodejs_18;
in
  buildFHSEnv {
    name = "ozma";
    targetPkgs = pkgs:
      with pkgs;
      with nodejs.pkgs; [
        alejandra
        nodejs
        tern
        yarn-berry
        # vue-language-server
      ];
    runScript = writers.writeBash "run-script" ''
      if [ "$#" = 0 ]; then
        exec "''${SHELL:-bash}"
      else
        exec "$@"
      fi
    '';
  }
