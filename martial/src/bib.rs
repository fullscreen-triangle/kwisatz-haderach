//! BibTeX/BibLaTeX entry keys. Only the keys matter: a citation either names an entry or
//! it does not.

pub fn keys(text: &str) -> Vec<String> {
    let cs: Vec<char> = text.chars().collect();
    let mut out = vec![];
    let mut i = 0;
    while i < cs.len() {
        if cs[i] != '@' {
            i += 1;
            continue;
        }
        i += 1;
        let ts = i;
        while i < cs.len() && cs[i].is_ascii_alphabetic() {
            i += 1;
        }
        let kind: String = cs[ts..i].iter().collect::<String>().to_lowercase();
        while i < cs.len() && cs[i].is_whitespace() {
            i += 1;
        }
        if i >= cs.len() || !(cs[i] == '{' || cs[i] == '(') || kind.is_empty() {
            continue;
        }
        if matches!(kind.as_str(), "string" | "comment" | "preamble") {
            continue;
        }
        i += 1;
        let ks = i;
        while i < cs.len() && cs[i] != ',' && cs[i] != '}' && cs[i] != '\n' {
            i += 1;
        }
        let key: String = cs[ks..i].iter().collect::<String>().trim().to_string();
        if !key.is_empty() {
            out.push(key);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    #[test]
    fn reads_entry_keys_and_skips_strings() {
        let t = "@string{j = \"J\"}\n@article{smith2020,\n title={A}}\n@InProceedings{ lee:21 , x=1}\n@comment{no}";
        assert_eq!(super::keys(t), ["smith2020", "lee:21"]);
    }
}
