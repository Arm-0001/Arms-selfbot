import re
import sys
import time

pattern = sys.argv[1]
skip_wait = len(sys.argv) > 2
regex = r'\b\w*(?:' + pattern + r')\w*\b'

def find_word(file_name, regex, wait=True):
    with open(file_name, 'r') as f:
        for line in f:
            if re.search(regex, line):
                word = line.strip()
                if not skip_wait and wait:
                    time.sleep(3)
                return word

def main():
    word = find_word('common_words.txt', regex, wait=2)
    if not word:
        word = find_word('sorted_by_size.txt', regex)
    if word:
        if not skip_wait:
            time.sleep(2)
        print(word)

if __name__ == '__main__':
    main()