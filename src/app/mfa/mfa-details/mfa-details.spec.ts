import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MfaDetails } from './mfa-details';

describe('MfaDetails', () => {
  let component: MfaDetails;
  let fixture: ComponentFixture<MfaDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MfaDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MfaDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
