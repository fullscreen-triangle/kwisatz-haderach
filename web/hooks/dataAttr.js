function dataAttr($target, $data, $defaul = false, rAttr = true) {

    if (!$target)
        return;

    const out = $target.getAttribute('data-dsn-' + $data);
    if (rAttr)
        removeAttr($target, $data);

    try {
        return JSON.parse(out);
    } catch (e) {
        if (out)
            return out;
        else
            return $defaul
    }
}

export function removeAttr($target, $data) {

    if (!$target)
        return;

    $target.removeAttribute('data-dsn-' + $data);


}


export default dataAttr;