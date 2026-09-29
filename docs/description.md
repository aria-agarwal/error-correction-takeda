# Overview

Background: This block is a fully custom block built for error correction based on grouping sequences based off length, and for each sequence looking at more abundant sequences of the same length. If the more abundant sequence has a small enough hamming distance has a higher minimum abundance ration (which is how much more abundant a potential parent must be than the child sequence), the rarer sequence is treated as the error and removed. This block also has toggles to filter available sequences based off minimum and maximum length cutoffs.
