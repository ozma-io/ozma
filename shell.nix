{ nixpkgs ? import <nixpkgs> {} }:

nixpkgs.callPackage ../common.nix {
  extraPkgs = pkgs: with pkgs; [ pkgs.nodejs ];
}
