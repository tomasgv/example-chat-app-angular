import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageComponent } from './message';

describe('Message', () => {
  let component: MessageComponent;
  let fixture: ComponentFixture<MessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageComponent);
    component = fixture.componentInstance;
    // Provide a minimal message input so template bindings don't fail
    component.message = {
      id: 'm1',
      text: 'hello',
      userId: 'u1',
      username: 'Alice',
      timestamp: new Date(),
      roomId: 'r1'
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
