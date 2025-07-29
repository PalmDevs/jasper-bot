export async function replaceAllAsync(
    str: string,
    regex: RegExp,
    asyncFn: (match: RegExpExecArray) => Promise<string>,
): Promise<string> {
    const promises: Promise<string>[] = []
    for (const match of str.matchAll(regex)) promises.push(asyncFn(match))

    const data = await Promise.all(promises)
    let i = 0
    return str.replace(regex, () => data[i++]!)
}
