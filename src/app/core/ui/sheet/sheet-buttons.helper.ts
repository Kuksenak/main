import { TemplatePortal } from '@angular/cdk/portal';
import { TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { SHEET_REF, SheetRef } from './sheet';

/**
 * Creates a per-component registrar for bottom sheet buttons.
 * Call it in a class field initializer, then register a template in ngAfterViewInit.
 */
export function createSheetButtonsRegistrar() {
  const sheetRef = inject<SheetRef | null>(SHEET_REF, { optional: true });
  const viewContainerRef = inject(ViewContainerRef);

  return {
    register(templateRef: TemplateRef<unknown>) {
      if (!sheetRef) {
        return null;
      }

      sheetRef.setButtons(new TemplatePortal(templateRef, viewContainerRef));
      return sheetRef;
    },
    sheetRef,
  };
}

/**
 * Creates a per-component registrar for right-side header actions.
 * Call it in a class field initializer, then register a template in ngAfterViewInit.
 */
export function createSheetHeaderRegistrar() {
  const sheetRef = inject<SheetRef | null>(SHEET_REF, { optional: true });
  const viewContainerRef = inject(ViewContainerRef);

  return {
    register(templateRef: TemplateRef<unknown>) {
      if (!sheetRef) {
        return null;
      }

      sheetRef.setHeader(new TemplatePortal(templateRef, viewContainerRef));
      return sheetRef;
    },
    sheetRef,
  };
}

/**
 * Creates a per-component title controller for the sheet header.
 */
export function createSheetTitleRegistrar() {
  const sheetRef = inject<SheetRef | null>(SHEET_REF, { optional: true });

  return {
    set(title: string | null) {
      if (!sheetRef) {
        return null;
      }

      sheetRef.setTitle(title);
      return sheetRef;
    },
    sheetRef,
  };
}
