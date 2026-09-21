import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('Barista');
  protected readonly tagline = signal(
    'Drop in a Java project and read its class diagram. Nothing leaves your browser.',
  );
}
