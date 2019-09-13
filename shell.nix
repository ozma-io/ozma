{ nixpkgs ? import <nixpkgs> {} }@args:

(import ../common.nix args).shell.override {
  extraPkgs = pkgs: with pkgs; [ nodejs nodePackages.tern yarn nodePackages."@vue/cli" ];
}
