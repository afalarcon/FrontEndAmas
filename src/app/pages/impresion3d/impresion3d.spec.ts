import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Impresion3d } from './impresion3d';

describe('Impresion3d', () => {
  let component: Impresion3d;
  let fixture: ComponentFixture<Impresion3d>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Impresion3d]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Impresion3d);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
