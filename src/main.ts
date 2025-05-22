import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AutocompleteMapComponent } from './app/app.component';

bootstrapApplication(AutocompleteMapComponent, appConfig)
  .catch((err) => console.error(err));
