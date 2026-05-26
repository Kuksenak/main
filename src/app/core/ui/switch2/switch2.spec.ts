import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Switch2 } from './switch2';

describe('Switch2', () => {
  let component: Switch2;
  let fixture: ComponentFixture<Switch2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Switch2]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Switch2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
