import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LessonImportsService } from './lesson-imports.service';

/**
 * /imports/:id — a "lesson from photo ready" notification's link: opens its preview and steps
 * back to where you were (opened from outside the app: the lesson library under it).
 */
@Component({ selector: 'app-import-link', template: '' })
export class ImportLink {
  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
    if (id) inject(LessonImportsService).preview(id);
    const router = inject(Router);
    if ((history.state?.navigationId ?? 1) > 1) history.back();
    else router.navigate(['/lessons'], { replaceUrl: true });
  }
}
