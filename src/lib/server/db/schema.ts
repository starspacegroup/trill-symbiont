import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const appState = sqliteTable('app_state', {
	id: integer('id').primaryKey(),
	// Circle of Fifths state
	selectedKey: text('selected_key').notNull().default('C'),
	selectedScale: text('selected_scale').notNull().default('major'),
	selectedChord: text('selected_chord').notNull().default('I'),
	isSynchronized: integer('is_synchronized', { mode: 'boolean' }).notNull().default(true),
	showHelp: integer('show_help', { mode: 'boolean' }).notNull().default(false),
	showCircleOfFifths: integer('show_circle_of_fifths', { mode: 'boolean' })
		.notNull()
		.default(false),
	// Master controls
	masterVolume: real('master_volume').notNull().default(1.0),
	tempo: integer('tempo').notNull().default(99),
	isSequencerRunning: integer('is_sequencer_running', { mode: 'boolean' }).notNull().default(false),
	currentSequenceStep: integer('current_sequence_step').notNull().default(-1),
	// Timestamps
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const musicGridState = sqliteTable('music_grid_state', {
	id: integer('id').primaryKey(),
	squareIndex: integer('square_index').notNull(),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
	isExpanded: integer('is_expanded', { mode: 'boolean' }).notNull().default(false),
	// Oscillator controls
	primaryFreq: real('primary_freq').notNull().default(1.0),
	primaryWave: text('primary_wave').notNull().default('sawtooth'),
	primaryGain: real('primary_gain').notNull().default(1.5),
	primaryDecay: real('primary_decay').notNull().default(0.5),
	lfoFreq: real('lfo_freq').notNull().default(0.2),
	lfoWave: text('lfo_wave').notNull().default('sine'),
	lfoGain: real('lfo_gain').notNull().default(0),
	lfoDecay: real('lfo_decay').notNull().default(0.5)
});

export const evolutionState = sqliteTable('evolution_state', {
	id: integer('id').primaryKey(),
	isEvolving: integer('is_evolving', { mode: 'boolean' }).notNull().default(false),
	evolutionSpeed: integer('evolution_speed').notNull().default(500),
	currentStep: integer('current_step').notNull().default(0),
	maxSteps: integer('max_steps').notNull().default(16)
});
