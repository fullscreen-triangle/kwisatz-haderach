//! A stable 64-bit FNV-1a hash, used for protocol fingerprints.
//!
//! std's `DefaultHasher` is not stable across Rust releases, and a
//! fingerprint has to be comparable between runs made months apart.

pub struct Fnv64(u64);

impl Default for Fnv64 {
    fn default() -> Self {
        Fnv64(0xcbf2_9ce4_8422_2325)
    }
}

impl Fnv64 {
    pub fn write(&mut self, bytes: &[u8]) {
        for b in bytes {
            self.0 ^= *b as u64;
            self.0 = self.0.wrapping_mul(0x0000_0100_0000_01b3);
        }
    }

    /// Write a field followed by a separator byte that cannot occur in UTF-8,
    /// so ("ab","c") and ("a","bc") hash differently.
    pub fn field(&mut self, s: &str) {
        self.write(s.as_bytes());
        self.write(&[0xff]);
    }

    pub fn finish(&self) -> u64 {
        self.0
    }

    pub fn hex(&self) -> String {
        format!("{:016x}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_vector() {
        let mut h = Fnv64::default();
        h.write(b"a");
        assert_eq!(h.finish(), 0xaf63dc4c8601ec8c);
    }

    #[test]
    fn fields_are_separated() {
        let mut x = Fnv64::default();
        x.field("ab");
        x.field("c");
        let mut y = Fnv64::default();
        y.field("a");
        y.field("bc");
        assert_ne!(x.finish(), y.finish());
    }
}
