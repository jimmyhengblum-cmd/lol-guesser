import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { DdragonData } from '@/ddragon/types';
import { RoleRush } from './RoleRush';

function fakeChamp(id: string) {
  return {
    id,
    key: id,
    name: id,
    title: '',
    titleEn: '',
    hp: 0,
    attackdamage: 0,
    attackspeed: 0,
    armor: 0,
    spellblock: 0,
    movespeed: 0,
    tags: [],
    partype: '',
    attack: 0,
    magic: 0,
    difficulty: 0,
    attackrange: 0,
    imageFull: `${id}.png`,
  };
}

const data: DdragonData = {
  version: '14.24.1',
  champions: [fakeChamp('Alistar'), fakeChamp('Bard'), fakeChamp('Blitzcrank')],
  championsById: {
    Alistar: fakeChamp('Alistar'),
    Bard: fakeChamp('Bard'),
    Blitzcrank: fakeChamp('Blitzcrank'),
  },
  items: [],
  itemsById: {},
  summoners: [],
};

describe('RoleRush smoke', () => {
  it('picks a role, guesses a champion with no autocomplete, and lists it as found', async () => {
    const user = userEvent.setup();
    render(<RoleRush data={data} version={data.version} />);

    await user.click(screen.getByRole('button', { name: 'Support' }));

    const input = screen.getByPlaceholderText('Tape un nom de champion…');
    await user.type(input, 'alistar');

    // No dropdown/suggestion list rendered while typing.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(await screen.findByText('Alistar')).toBeInTheDocument();
    expect(screen.getByText(/Support · 1\//)).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('pauses (hides the input, no guessing) and resumes', async () => {
    const user = userEvent.setup();
    render(<RoleRush data={data} version={data.version} />);
    await user.click(screen.getByRole('button', { name: 'Support' }));

    await user.click(screen.getByRole('button', { name: 'Mettre en pause' }));
    expect(screen.getByText('En pause')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Tape un nom de champion…')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reprendre' }));
    expect(screen.getByPlaceholderText('Tape un nom de champion…')).toBeInTheDocument();
  });

  it('reset clears found progress and restarts the same run', async () => {
    const user = userEvent.setup();
    render(<RoleRush data={data} version={data.version} />);
    await user.click(screen.getByRole('button', { name: 'Support' }));

    await user.type(screen.getByPlaceholderText('Tape un nom de champion…'), 'alistar');
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(await screen.findByText('Alistar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réinitialiser la manche' }));
    expect(screen.queryByText('Alistar')).not.toBeInTheDocument();
    expect(screen.getByText(/Support · 0\//)).toBeInTheDocument();
  });
});
