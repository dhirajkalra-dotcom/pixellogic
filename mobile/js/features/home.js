// Home route — now just redirects to Projects (the true entry point).
import { go } from '../router.js';

export function render() {
  go('projects');
}
