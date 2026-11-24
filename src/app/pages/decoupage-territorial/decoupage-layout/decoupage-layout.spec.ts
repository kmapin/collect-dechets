import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DecoupageLayout } from './decoupage-layout';

describe('DecoupageLayout', () => {
  let component: DecoupageLayout;
  let fixture: ComponentFixture<DecoupageLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecoupageLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DecoupageLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
