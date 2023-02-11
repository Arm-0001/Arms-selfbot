import re
import sys
import time

pattern = sys.argv[1]
skip_wait = len(sys.argv) > 2
regex = re.compile(r'\b' + pattern + r'\w*\b')

def find_word(file_name, regex, wait=True):
    longest_word = None
    with open(file_name, 'r') as f:
        # get to the end of the file
        f.seek(0, 2)
        end_position = f.tell()
        f.seek(0, 0)
        position = end_position
        # read the file from the end to the beginning
        while position >= 0:
            # read a block of data from the file
            position = max(0, position - 4096)
            f.seek(position, 0)
            block = f.read(end_position - position)
            # search for the pattern in the block
            matches = regex.findall(block)
            if matches:
                # find the longest matching word in the block
                for match in matches:
                    if not longest_word or len(match) > len(longest_word):
                        longest_word = match
                # if we found a match, no need to search the rest of the file
                break
        if not skip_wait and wait:
            time.sleep(3)
    return longest_word

def main():
    word = find_word('sorted_by_size.txt', regex)
    if word:
        if not skip_wait:
            time.sleep(2)
        print(word)

if __name__ == '__main__':
    main()
