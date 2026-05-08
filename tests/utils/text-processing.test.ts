/**
 * Tests for the TextProcessor utility.
 *
 * Strategy: keep these tests tightly scoped to deterministic, regex-driven
 * behaviour. Anything that depends on Logger, VSCode, or external resources
 * is covered by the vscode mock at tests/__mocks__/vscode.ts; we don't
 * exercise it here.
 *
 * What's covered:
 *   1. normalizeWhitespace — collapses runs, trims, handles tabs
 *   2. normalizeQuotes — smart quotes, dashes
 *   3. removeExcessiveLineBreaks — \r\n, lone \r, 3+ newlines
 *   4. cleanForAnalysis — full composition pipeline
 *   5. extractSentences — sentence splitting + structure
 *   6. extractParagraphs — blank-line splitting
 *   7. analyzeText — aggregate statistics
 *   8. extractKeyTerms — frequency + stop-word filtering
 *   9. calculateSimilarity — Jaccard-style identity / disjoint cases
 *  10. findPatterns — regex registry against text
 */

import { TextProcessor } from '../../src/utils/text-processing';

describe('TextProcessor', () => {
  let tp: TextProcessor;

  beforeEach(() => {
    tp = new TextProcessor();
  });

  describe('normalizeWhitespace', () => {
    it('collapses multiple spaces into one', async () => {
      const out = await tp.normalizeWhitespace('foo    bar');
      expect(out).toBe('foo bar');
    });

    it('trims leading and trailing whitespace per line', async () => {
      const out = await tp.normalizeWhitespace('   leading and trailing   ');
      expect(out).toBe('leading and trailing');
    });

    it('replaces tabs with single spaces', async () => {
      const out = await tp.normalizeWhitespace('one\t\ttwo\t\t\tthree');
      expect(out).toBe('one two three');
    });

    it('keeps single spaces around words intact', async () => {
      const out = await tp.normalizeWhitespace('a b c');
      expect(out).toBe('a b c');
    });
  });

  describe('normalizeQuotes', () => {
    it('replaces smart double-quotes with straight ones', async () => {
      const out = await tp.normalizeQuotes('“hello”');
      expect(out).toBe('"hello"');
    });

    it('replaces smart single-quotes with straight ones', async () => {
      const out = await tp.normalizeQuotes('it’s');
      expect(out).toBe("it's");
    });

    it('replaces em-dashes between word characters with hyphens', async () => {
      const out = await tp.normalizeQuotes('hello—world');
      expect(out).toBe('hello-world');
    });

    it('leaves regular ASCII text untouched', async () => {
      const out = await tp.normalizeQuotes('plain "ascii" text');
      expect(out).toBe('plain "ascii" text');
    });
  });

  describe('removeExcessiveLineBreaks', () => {
    it('collapses runs of 3+ newlines into 2', async () => {
      const out = await tp.removeExcessiveLineBreaks('a\n\n\n\n\nb');
      expect(out).toBe('a\n\nb');
    });

    it('normalises CRLF line endings to LF', async () => {
      const out = await tp.removeExcessiveLineBreaks('a\r\nb\r\nc');
      expect(out).toBe('a\nb\nc');
    });

    it('replaces lone CR with LF', async () => {
      const out = await tp.removeExcessiveLineBreaks('a\rb\rc');
      expect(out).toBe('a\nb\nc');
    });

    it('strips trailing whitespace on each line', async () => {
      const out = await tp.removeExcessiveLineBreaks('alpha   \nbeta\t\t\ngamma');
      expect(out).toBe('alpha\nbeta\ngamma');
    });
  });

  describe('cleanForAnalysis (composition)', () => {
    it('chains whitespace, line-break, and quote normalisations', async () => {
      const dirty = 'It’s   sloppy.\r\n\r\n\r\nReally   sloppy.';
      const out = await tp.cleanForAnalysis(dirty);
      expect(out).toContain("It's");
      expect(out).not.toMatch(/\r/);
      // No more triple newlines
      expect(out).not.toMatch(/\n{3,}/);
      // No more multi-space runs
      expect(out).not.toMatch(/ {2,}/);
    });
  });

  describe('extractSentences', () => {
    it('splits on terminal punctuation and reports word counts', async () => {
      const text = 'First one. Second one! Third? Tail';
      const sentences = await tp.extractSentences(text);

      expect(sentences).toHaveLength(4);
      expect(sentences[0].text.trim()).toBe('First one.');
      expect(sentences[0].wordCount).toBe(2);
      expect(sentences[1].text.trim()).toBe('Second one!');
      expect(sentences[2].text.trim()).toBe('Third?');
      expect(sentences[3].text).toBe('Tail');
    });

    it('classifies declarative, interrogative, imperative, exclamatory', async () => {
      const sentences = await tp.extractSentences(
        'A normal sentence. Is this a question? Stop right there! Do this thing.'
      );

      const types = sentences.map(s => s.type);
      expect(types).toContain('declarative');
      expect(types).toContain('interrogative');
      expect(types).toContain('exclamatory');
    });

    it('flags sentences containing citation-like markers', async () => {
      const sentences = await tp.extractSentences(
        'Plain sentence. As shown by Smith (2020) the result holds.'
      );
      const flagged = sentences.find(s => s.containsCitation);
      expect(flagged).toBeDefined();
      expect(flagged!.text).toMatch(/Smith/);
    });

    it('returns an empty array on empty input', async () => {
      const sentences = await tp.extractSentences('');
      expect(sentences).toEqual([]);
    });
  });

  describe('extractParagraphs', () => {
    it('splits on blank lines and trims each paragraph', async () => {
      const text = 'Para one.\n\nPara two has\nmultiple lines.\n\n\nPara three.';
      const paragraphs = await tp.extractParagraphs(text);

      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[0]).toBe('Para one.');
      expect(paragraphs[1]).toBe('Para two has\nmultiple lines.');
      expect(paragraphs[2]).toBe('Para three.');
    });

    it('treats whitespace-only blocks as separators (not content)', async () => {
      const text = 'A.\n   \n\nB.';
      const paragraphs = await tp.extractParagraphs(text);
      expect(paragraphs).toEqual(['A.', 'B.']);
    });
  });

  describe('analyzeText', () => {
    it('produces sensible aggregate statistics for a short paragraph', async () => {
      const text =
        'The quick brown fox jumps over the lazy dog. ' +
        'Reading is good for the soul. ' +
        'Tests are essential.';
      const result = await tp.analyzeText(text);

      // Word count: 9 + 6 + 3 = 18 words exactly.
      expect(result.wordCount).toBe(18);
      expect(result.characterCount).toBe(text.length);
      expect(result.lineCount).toBeGreaterThanOrEqual(1);
      expect(result.paragraphCount).toBeGreaterThanOrEqual(1);
      expect(result.averageWordsPerSentence).toBeGreaterThan(0);
      expect(result.readingTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(typeof result.detectedLanguage).toBe('string');
      expect(typeof result.readabilityScore).toBe('number');
    });

    it('returns zero stats for empty input', async () => {
      const result = await tp.analyzeText('');
      expect(result.wordCount).toBe(0);
      expect(result.characterCount).toBe(0);
      expect(result.averageWordsPerSentence).toBe(0);
    });
  });

  describe('extractKeyTerms', () => {
    it('returns most-frequent non-stop-word terms', async () => {
      const text =
        'citation citation citation paper paper validation ' +
        'the the the the of of of and and';
      const terms = await tp.extractKeyTerms(text, 5);

      // Stop words ('the', 'of', 'and') should be excluded; 'citation' is the
      // most frequent of the remaining content words.
      expect(terms[0]).toBe('citation');
      expect(terms).toContain('paper');
      expect(terms).toContain('validation');
      expect(terms).not.toContain('the');
      expect(terms).not.toContain('and');
    });

    it('respects the maxTerms limit', async () => {
      const text = Array.from({ length: 20 }, (_, i) => `term${i}`).join(' ');
      const terms = await tp.extractKeyTerms(text, 5);
      expect(terms.length).toBeLessThanOrEqual(5);
    });

    it('excludes very short tokens', async () => {
      const text = 'a be at to in citation citation citation';
      const terms = await tp.extractKeyTerms(text, 10);
      // Anything ≤3 chars is filtered, regardless of stop-word status.
      expect(terms).not.toContain('be');
      expect(terms).not.toContain('at');
    });
  });

  describe('calculateSimilarity', () => {
    it('returns 1 for identical texts', async () => {
      const score = await tp.calculateSimilarity('hello world', 'hello world');
      expect(score).toBe(1);
    });

    it('returns 0 for fully disjoint texts', async () => {
      const score = await tp.calculateSimilarity('apple banana', 'truck wheel');
      expect(score).toBe(0);
    });

    it('returns a fractional Jaccard for partially-overlapping texts', async () => {
      // sets: {alpha, beta} and {beta, gamma} — overlap 1, union 3 → 1/3
      const score = await tp.calculateSimilarity('alpha beta', 'beta gamma');
      expect(score).toBeCloseTo(1 / 3, 5);
    });

    it('returns 0 when both texts are empty', async () => {
      const score = await tp.calculateSimilarity('', '');
      expect(score).toBe(0);
    });
  });

  describe('findPatterns', () => {
    it('returns matches per named pattern', async () => {
      const text =
        'See Smith (2020) and Jones et al. (2021). ' +
        'Email: alice@example.com. URL: https://example.org/path.';

      const result = await tp.findPatterns(text, {
        years: /\(\d{4}\)/,
        // Tightened email regex: TLD ends on word chars only — prevents
        // greedily eating a trailing sentence-period into the address.
        emails: /[\w.+-]+@[\w-]+\.[A-Za-z]{2,}/,
        urls: /https?:\/\/\S+?(?=\s|$|\.[\s])/
      });

      expect(result.years).toContain('(2020)');
      expect(result.years).toContain('(2021)');
      expect(result.emails).toContain('alice@example.com');
      expect(result.urls?.[0]).toMatch(/^https:\/\/example\.org/);
    });

    it('returns an empty array for unmatched patterns', async () => {
      const result = await tp.findPatterns('plain text', {
        digits: /\d+/
      });
      expect(result.digits).toEqual([]);
    });
  });
});
