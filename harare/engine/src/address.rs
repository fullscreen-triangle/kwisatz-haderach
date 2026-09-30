//! τ — the identity of a node, as a hierarchical address.
//!
//! The same address is the same node (convergence), and a prefix names a
//! region: everything under `greifswald/dentist` is one subtree that can be
//! watched, reported or re-run together.

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Address(Vec<String>);

impl Address {
    /// Parse `a/b/c`. Leading and trailing slashes are ignored; empty
    /// segments, whitespace-only segments and control characters are not
    /// addresses.
    pub fn parse(s: &str) -> Result<Self, String> {
        let trimmed = s.trim().trim_matches('/');
        if trimmed.is_empty() {
            return Err("an address needs at least one segment".into());
        }
        let mut segs = Vec::new();
        for seg in trimmed.split('/') {
            let seg = seg.trim();
            if seg.is_empty() {
                return Err(format!("empty segment in address {s:?}"));
            }
            if seg.chars().any(|c| c.is_control()) {
                return Err(format!("control character in address {s:?}"));
            }
            segs.push(seg.to_string());
        }
        Ok(Address(segs))
    }

    pub fn segments(&self) -> &[String] {
        &self.0
    }

    pub fn depth(&self) -> usize {
        self.0.len()
    }

    /// `a/b` is a prefix of `a/b` and of `a/b/c`, not of `a/bc`.
    pub fn is_prefix_of(&self, other: &Address) -> bool {
        self.0.len() <= other.0.len() && self.0.iter().zip(&other.0).all(|(a, b)| a == b)
    }

    pub fn child(&self, segment: &str) -> Result<Address, String> {
        let mut next = self.clone();
        let tail = Address::parse(segment)?;
        next.0.extend(tail.0);
        Ok(next)
    }

    pub fn parent(&self) -> Option<Address> {
        (self.0.len() > 1).then(|| Address(self.0[..self.0.len() - 1].to_vec()))
    }

    pub fn leaf(&self) -> &str {
        self.0.last().map(String::as_str).unwrap_or("")
    }
}

impl fmt::Display for Address {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0.join("/"))
    }
}

impl std::str::FromStr for Address {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, String> {
        Address::parse(s)
    }
}

impl Serialize for Address {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

impl<'de> Deserialize<'de> for Address {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let s = String::deserialize(d)?;
        Address::parse(&s).map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_and_prints() {
        let a = Address::parse("/greifswald/dentist/").unwrap();
        assert_eq!(a.to_string(), "greifswald/dentist");
        assert_eq!(a.depth(), 2);
        assert_eq!(a.leaf(), "dentist");
    }

    #[test]
    fn rejects_empty_segments() {
        assert!(Address::parse("").is_err());
        assert!(Address::parse("a//b").is_err());
        assert!(Address::parse("a/ /b").is_err());
    }

    #[test]
    fn prefix_is_segmentwise() {
        let ab = Address::parse("a/b").unwrap();
        assert!(ab.is_prefix_of(&Address::parse("a/b").unwrap()));
        assert!(ab.is_prefix_of(&Address::parse("a/b/c").unwrap()));
        assert!(!ab.is_prefix_of(&Address::parse("a/bc").unwrap()));
        assert!(!ab.is_prefix_of(&Address::parse("a").unwrap()));
    }

    #[test]
    fn child_and_parent() {
        let a = Address::parse("a").unwrap();
        let abc = a.child("b/c").unwrap();
        assert_eq!(abc.to_string(), "a/b/c");
        assert_eq!(abc.parent().unwrap().to_string(), "a/b");
        assert!(a.parent().is_none());
    }
}
