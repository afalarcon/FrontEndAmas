import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingWhatsapp } from './floating-whatsapp';

describe('FloatingWhatsapp', () => {
  let component: FloatingWhatsapp;
  let fixture: ComponentFixture<FloatingWhatsapp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingWhatsapp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloatingWhatsapp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
