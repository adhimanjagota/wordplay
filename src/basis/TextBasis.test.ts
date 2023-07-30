import Evaluator from '@runtime/Evaluator';
import { test, expect } from 'vitest';
import { DefaultLocale } from '../db/Creator';

test('Test text functions', () => {
    expect(
        Evaluator.evaluateCode(DefaultLocale, '"hello".length()')?.toString()
    ).toBe('5');
});
