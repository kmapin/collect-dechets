import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DecoupageLayout } from './decoupage-layout';

describe('DecoupageLayout', () => {
  let component: DecoupageLayout;
  let fixture: ComponentFixture<DecoupageLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecoupageLayout],
      providers: [provideRouter([])],
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
