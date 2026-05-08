import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Snack } from './snack';

describe('Snack', () => {
  let component: Snack;
  let fixture: ComponentFixture<Snack>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Snack]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Snack);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
