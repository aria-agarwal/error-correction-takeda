**Background:**
This block is a fully custom block built for error correction based on grouping sequences based off length, and for each sequence
looking at more abundant sequences of the same length. If the more abundant sequence has a small enough hamming distance has a 
higher minimum abundance ration (which is how much more abundant a potential parent must be than the child sequence), the rarer 
sequence is treated as the error and removed. This block also has toggles to filter available sequences based off minimum and 
maximum length cutoffs. 

**Key Files:**
1. main.tpl.tengo selects and bundles columns containing all read counts and property columns.
2. process.tpl.tengo finds requested columns, verifies that bundled columns exist, and exports a small input.tsv containing only
   sampleId, clonotypeKey, seq, and count. This file also runs error.py which is the python file containing error correction logic. After
   executing error.py, this file receives all abundance and property columns, filters the full dataset using the clean TSV from error.py,
   and creates the output as a Platforma pframe. 
3. error.py executes error correction logic by receiving input.tsv and user parameters. It groups rows by sequence and identifies low
   abundance sequences within hamming distance of more abundant sequences, removes the errors, and creates a clean TSV.
   
