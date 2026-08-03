import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the jobmatch analysis form', () => {
  render(<App />);
  expect(screen.getByText(/jobmatch/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/paste job description/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /generate ai career report/i })).toBeInTheDocument();
});
