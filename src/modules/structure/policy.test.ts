import { describe, expect, it } from "vitest";
import {
  canCreateSede,
  canDeleteSede,
  canEditSede,
  canManageCongregations,
  canManageCongregationsIn,
} from "@/modules/structure/policy";

const churchWide = {
  sedeId: null,
  congregationId: null,
  isSuperAdmin: true,
};

const sedeAdmin = {
  sedeId: "sede-a",
  congregationId: null,
  isSuperAdmin: false,
};

const congregationAdmin = {
  sedeId: "sede-a",
  congregationId: "cong-a",
  isSuperAdmin: false,
};

describe("política de estrutura da igreja", () => {
  it("super admin da igreja gerencia sedes e qualquer congregação", () => {
    expect(canCreateSede(churchWide)).toBe(true);
    expect(canDeleteSede(churchWide)).toBe(true);
    expect(canEditSede(churchWide, "sede-b")).toBe(true);
    expect(canManageCongregations(churchWide)).toBe(true);
    expect(canManageCongregationsIn(churchWide, "sede-b")).toBe(true);
  });

  it("admin de sede gerencia apenas as congregações da própria sede", () => {
    expect(canCreateSede(sedeAdmin)).toBe(false);
    expect(canDeleteSede(sedeAdmin)).toBe(false);
    expect(canEditSede(sedeAdmin, "sede-a")).toBe(true);
    expect(canEditSede(sedeAdmin, "sede-b")).toBe(false);
    expect(canManageCongregations(sedeAdmin)).toBe(true);
    expect(canManageCongregationsIn(sedeAdmin, "sede-a")).toBe(true);
    expect(canManageCongregationsIn(sedeAdmin, "sede-b")).toBe(false);
  });

  it("admin de congregação fica somente leitura na estrutura", () => {
    expect(canCreateSede(congregationAdmin)).toBe(false);
    expect(canDeleteSede(congregationAdmin)).toBe(false);
    expect(canEditSede(congregationAdmin, "sede-a")).toBe(false);
    expect(canManageCongregations(congregationAdmin)).toBe(false);
    expect(canManageCongregationsIn(congregationAdmin, "sede-a")).toBe(false);
  });

  it("super admin com sede vinculada não ganha acesso à igreja inteira", () => {
    const scopedSuper = {
      sedeId: "sede-a",
      congregationId: null,
      isSuperAdmin: true,
    };

    expect(canCreateSede(scopedSuper)).toBe(false);
    expect(canDeleteSede(scopedSuper)).toBe(false);
    expect(canEditSede(scopedSuper, "sede-a")).toBe(true);
    expect(canEditSede(scopedSuper, "sede-b")).toBe(false);
    expect(canManageCongregationsIn(scopedSuper, "sede-b")).toBe(false);
  });
});
